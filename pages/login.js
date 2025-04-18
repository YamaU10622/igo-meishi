import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function LoginPage() {
  const router = useRouter();
  const { redirect = "/" } = router.query;
  const [user, loading] = useAuthState(auth);
  const hasTriedLogin = useRef(false);

  useEffect(() => {
    if (loading || hasTriedLogin.current) return;

    // ログイン済み
    if (user) {
      // リダイレクト先が /meishi のときは uid を付けて遷移
      if (redirect === "/meishi") {
        router.replace(`/meishi/${user.uid}`);
      } else {
        router.replace(redirect);
      }
      return;
    }

    hasTriedLogin.current = true;

    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const uid = result.user?.uid;
        if (redirect === "/meishi") {
          router.replace(`/meishi/${uid}`);
        } else {
          router.replace(redirect);
        }
      })
      .catch((error) => {
        console.error("ログインエラー:", error);
        if (error.code !== "auth/cancelled-popup-request") {
          alert("ログインに失敗しました");
        }
        router.replace("/");
      });
  }, [user, loading, redirect, router]);

  return null;
}