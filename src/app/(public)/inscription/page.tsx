import Link from "next/link";
import { AuthForm } from "@/components/ui/AuthForm";
import { signUp } from "../connexion/actions";

export const metadata = { title: "Créer un compte organisateur" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="av-fade-up av-card flex flex-col gap-5 p-7">
        <div>
          <h1 className="m-0 text-[26px] font-extrabold">Créer un compte organisateur</h1>
          <p className="m-0 mt-1 text-sm text-muted">Lancez vos concours, awards et élections. Un administrateur valide chaque compte avant la première publication.</p>
        </div>
        <AuthForm
          action={signUp}
          submit="Créer mon compte"
          fields={[
            { name: "full_name", label: "Nom et prénom", autoComplete: "name" },
            { name: "organization_name", label: "Organisation (facultatif)", autoComplete: "organization", required: false },
            { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
            { name: "password", label: "Mot de passe (10 caractères minimum)", type: "password", autoComplete: "new-password" },
          ]}
        />
        <p className="m-0 text-sm text-muted">Déjà inscrit ? <Link href="/connexion" className="font-semibold text-primary">Se connecter</Link></p>
      </div>
    </div>
  );
}
