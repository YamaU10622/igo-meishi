import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import MeishiForm from "../components/MeishiForm";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function CreatePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/create");
    }
  }, [loading, user]);

  if (loading) {
    return null;
  }

  if (!user) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: 'var(--black)' }}>
      <div className="container mx-auto p-8 bg-white bg-opacity-80 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-4">囲碁名刺作成フォーム</h1>
        <MeishiForm user={user} />
      </div>
    </div>
  );
}