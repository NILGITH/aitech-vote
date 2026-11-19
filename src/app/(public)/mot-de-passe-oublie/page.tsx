import { AuthForm } from "@/components/ui/AuthForm";
import { resetPassword } from "../connexion/actions";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="av-card flex flex-col gap-5 p-7">
        <h1 className="m-0 text-[26px] font-extrabold">Mot de passe oublié</h1>
        <AuthForm action={resetPassword} submit="Recevoir le lien" fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]} />
      </div>
    </div>
  );
}
