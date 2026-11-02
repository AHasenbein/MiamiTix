import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { User } from "../domain/auth-provider.js";
import type { UserRepository } from "../domain/user-repository.js";
import { HttpError } from "../../../shared/http-error.js";
import { SessionService } from "./session-service.js";
import { env } from "../../../config/env.js";
import type { EmailSender, VerificationEmailResult } from "../domain/email-sender.js";
import type { OAuthProviderId, OAuthIdentity } from "../domain/oauth-provider-adapter.js";
import {
  isTopTrustedSeller,
  isPrimaryTrustedSeller,
  isTrustedSeller
} from "../../../shared/trusted-seller.js";

export interface RegisterInput {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: UserResponse;
}

export interface RegisterResult {
  user: UserResponse;
  verificationRequired: boolean;
  verificationEmailSent: boolean;
  verificationPreviewUrl?: string;
  token?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  providers: string[];
  emailVerified: boolean;
  isTrustedSeller: boolean;
  isPrimaryTrustedSeller: boolean;
  isTopTrustedSeller: boolean;
  createdAt: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly emailSender: EmailSender
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new HttpError(409, "An account with this email already exists.");
    }

    const verificationRequired = env.REQUIRE_EMAIL_VERIFICATION;
    const verificationToken = verificationRequired
      ? this.generateVerificationToken()
      : undefined;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user: User = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      displayName: input.displayName.trim(),
      passwordHash,
      emailVerified: !verificationRequired,
      emailVerificationTokenHash: verificationToken
        ? this.hashVerificationToken(verificationToken)
        : undefined,
      emailVerificationExpiresAt: verificationToken
        ? new Date(Date.now() + 1000 * 60 * 60 * 24)
        : undefined,
      providers: [
        {
          provider: "password",
          providerUserId: normalizedEmail
        }
      ],
      createdAt: new Date()
    };

    const createdUser = await this.userRepository.create(user);

    if (!verificationRequired) {
      const token = this.sessionService.createToken({ userId: createdUser.id });
      return {
        user: this.toUserResponse(createdUser),
        verificationRequired: false,
        verificationEmailSent: false,
        token
      };
    }

    const verificationUrl = `${env.APP_WEB_URL}/auth/verify-email?token=${encodeURIComponent(
      verificationToken!
    )}`;

    let emailResult: VerificationEmailResult = {};
    let verificationEmailSent = true;
    try {
      emailResult = await this.emailSender.sendVerificationEmail(
        createdUser.email,
        verificationUrl
      );
    } catch (error) {
      verificationEmailSent = false;
      console.error(
        `[auth] verification email send failed for ${createdUser.email}. User was still created; manual verification URL: ${verificationUrl}`,
        error
      );
    }

    return {
      user: this.toUserResponse(createdUser),
      verificationRequired: true,
      verificationEmailSent,
      verificationPreviewUrl:
        env.NODE_ENV === "production" ? undefined : emailResult.previewUrl
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new HttpError(401, "Invalid email or password.");
    }

    if (env.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      throw new HttpError(
        403,
        "Please verify your email before logging in. Check your inbox for the link."
      );
    }

    const token = this.sessionService.createToken({ userId: user.id });

    return {
      token,
      user: this.toUserResponse(user)
    };
  }

  async getCurrentUser(token: string): Promise<UserResponse> {
    const payload = this.sessionService.verifyToken(token);
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new HttpError(401, "Session is invalid.");
    }

    return this.toUserResponse(user);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashVerificationToken(token);
    const user = await this.userRepository.findByEmailVerificationTokenHash(tokenHash);

    if (!user || !user.emailVerificationExpiresAt) {
      throw new HttpError(400, "Verification link is invalid.");
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new HttpError(400, "Verification link has expired.");
    }

    const updatedUser: User = {
      ...user,
      emailVerified: true,
      emailVerificationTokenHash: undefined,
      emailVerificationExpiresAt: undefined
    };
    await this.userRepository.update(updatedUser);

    return { message: "Email verified. You can now log in." };
  }

  async resendVerificationEmail(
    email: string
  ): Promise<{ message: string; verificationPreviewUrl?: string }> {
    if (!env.REQUIRE_EMAIL_VERIFICATION) {
      return { message: "Email verification is currently disabled. You can log in directly." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || user.emailVerified) {
      return { message: "If an account exists, a verification email has been sent." };
    }

    const verificationToken = this.generateVerificationToken();
    const updatedUser: User = {
      ...user,
      emailVerificationTokenHash: this.hashVerificationToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    };
    await this.userRepository.update(updatedUser);

    const verificationUrl = `${env.APP_WEB_URL}/auth/verify-email?token=${encodeURIComponent(
      verificationToken
    )}`;

    try {
      const emailResult = await this.emailSender.sendVerificationEmail(
        updatedUser.email,
        verificationUrl
      );
      return {
        message: "If an account exists, a verification email has been sent.",
        verificationPreviewUrl:
          env.NODE_ENV === "production" ? undefined : emailResult.previewUrl
      };
    } catch (error) {
      console.error(
        `[auth] resend verification email failed for ${updatedUser.email}. Manual verification URL: ${verificationUrl}`,
        error
      );
      return {
        message: "If an account exists, a verification email has been sent."
      };
    }
  }

  async loginOrRegisterOAuth(
    providerId: OAuthProviderId,
    identity: OAuthIdentity
  ): Promise<AuthResult> {
    const normalizedEmail = identity.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (!existingUser) {
      const createdUser: User = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        displayName: identity.displayName?.trim() || normalizedEmail.split("@")[0] || "User",
        emailVerified: true,
        providers: [
          {
            provider: providerId,
            providerUserId: identity.providerUserId
          }
        ],
        createdAt: new Date()
      };

      const savedUser = await this.userRepository.create(createdUser);
      const token = this.sessionService.createToken({ userId: savedUser.id });
      return { token, user: this.toUserResponse(savedUser) };
    }

    const hasProvider = existingUser.providers.some(
      (provider) => provider.provider === providerId
    );
    const mergedUser: User = {
      ...existingUser,
      // If the email was never verified, whoever set the existing password never proved they
      // own the inbox. Drop that password so a pre-registered account can't be taken over once
      // the real owner signs in with Google.
      passwordHash: existingUser.emailVerified ? existingUser.passwordHash : undefined,
      providers: (hasProvider
        ? existingUser.providers
        : [
            ...existingUser.providers,
            {
              provider: providerId,
              providerUserId: identity.providerUserId
            }
          ]
      ).filter((provider) => existingUser.emailVerified || provider.provider !== "password"),
      emailVerified: true
    };
    await this.userRepository.update(mergedUser);

    const token = this.sessionService.createToken({ userId: mergedUser.id });
    return { token, user: this.toUserResponse(mergedUser) };
  }

  private toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      providers: user.providers.map((provider) => provider.provider),
      emailVerified: user.emailVerified,
      isTrustedSeller: isTrustedSeller(user.email),
      isPrimaryTrustedSeller: isPrimaryTrustedSeller(user.email),
      isTopTrustedSeller: isTopTrustedSeller(user.email),
      createdAt: user.createdAt.toISOString()
    };
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private hashVerificationToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
