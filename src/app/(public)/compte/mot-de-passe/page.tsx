import { AuthForm } from "@/components/ui/AuthForm";
import { updatePassword } from "./actions";

export const metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="av-card flex flex-col gap-5 p-7">
        <h1 className="m-0 text-[26px] font-extrabold">Choisir un mot de passe</h1>
        <AuthForm action={updatePassword} submit="Enregistrer" fields={[{ name: "password", label: "Nouveau mot de passe (10 caractères minimum)", type: "password", autoComplete: "new-password" }]} />
      </div>
    </div>
  );
}
