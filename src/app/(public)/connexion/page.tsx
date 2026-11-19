import Link from "next/link";
import { AuthForm } from "@/components/ui/AuthForm";
import { signIn } from "./actions";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string; erreur?: string }> }) {
  const { suite, erreur } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="av-fade-up av-card flex flex-col gap-5 p-7">
        <div>
          <h1 className="m-0 text-[26px] font-extrabold">Connexion</h1>
          <p className="m-0 mt-1 text-sm text-muted">Organisateurs, membres du jury et administrateurs.</p>
        </div>
        {erreur === "suspendu" && <p className="m-0 rounded-xl bg-[#FFF6F5] p-3 text-sm text-danger">Ce compte est suspendu. Contactez l&apos;administrateur.</p>}
        <AuthForm
          action={signIn}
          submit="Se connecter"
          hidden={{ suite: suite ?? "" }}
          fields={[
            { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
            { name: "password", label: "Mot de passe", type: "password", autoComplete: "current-password" },
          ]}
        />
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link href="/mot-de-passe-oublie" className="font-semibold text-primary">Mot de passe oublié</Link>
          <Link href="/inscription" className="font-semibold text-primary">Créer un compte organisateur</Link>
        </div>
      </div>
    </div>
  );
}
