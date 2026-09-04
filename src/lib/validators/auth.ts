import { z } from "zod";

export const emailSchema = z.email("Enter a valid email address").trim().toLowerCase().max(254);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", { error: "Please acknowledge the disclaimer to continue" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export const otpSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resendSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["VERIFY_EMAIL", "RESET_PASSWORD"]),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};
