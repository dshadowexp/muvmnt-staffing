import { z } from "zod";

export const verificationSchema = z.object({
    email: z.string().email("Invalid email"),
    phone: z.string().min(1, "Phone number is required"),
});

export type VerificationFormValues = z.infer<typeof verificationSchema>;

export const locationSchema = z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province is required"),
    postalCode: z.string().min(1, "Postal code is required"),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export type FormValues = VerificationFormValues & LocationFormValues;