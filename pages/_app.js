import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
// import Header from "../components/Header"; // ユーザー名表示 + ログアウト用（これから作る）
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Component {...pageProps} user={user} />
    </>
  );
}