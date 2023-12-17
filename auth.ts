import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { User } from "./app/lib/definitions";
import { sql } from "@vercel/postgres";
import bcrypt from "bcrypt";

// Get user from database

async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
        return user.rows[0];
    } catch (error) {
        console.log(error);
        throw new Error("Failed to get user");
    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [credentials({
        async authorize(credentials) {
            const parsedCredentials = z.object({
                email: z.string().email(), password: z.string().min(6)
            }).safeParse(credentials);

            if (parsedCredentials.success) {
                const { email, password } = parsedCredentials.data;
                const user = await getUser(email);
                if (!user) return null;

                const passwordMatch = await bcrypt.compare(password, user.password);
                if (passwordMatch) {
                    return user;
                }
            }
            console.log("Invalid credentials")
            return null;
        },
    })],
});