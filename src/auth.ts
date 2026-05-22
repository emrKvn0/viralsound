import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Giriş Yap",
      credentials: {
        email: { label: "E-posta", type: "email", placeholder: "test@ornek.com" },
        name: { label: "Kullanıcı Adı", type: "text", placeholder: "viral_creator" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const emailStr = credentials.email as string;
        const nameStr = (credentials.name as string) || "Viral User";

        // Kullanıcıyı bul veya yoksa oluştur (Demo & Neon kolaylığı için)
        let user = await db.user.findUnique({
          where: { email: emailStr },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              email: emailStr,
              name: nameStr,
            },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.AUTH_SECRET,
});
export default auth;
