import { useRouter } from 'next/router';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";

export default function Header({onLoginClick}) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const handleLoginClick = () => {
    if (!user) {
      if (onLoginClick) {
        onLoginClick(); 
      } else {
        router.push(`/login?redirect=/`);
      }
    }
  }

  return (
    <div className="top-0 right-0 m-4">
        {user ? (
          <div className="flex items-center gap-2">
            <span>{user.displayName} でログイン中</span>
            <button onClick={() => auth.signOut()} className="text-blue-600 hover:underline">
              ログアウト
            </button>
          </div>
        ) : (
          <button onClick={handleLoginClick} className="text-black hover:text-gray-400">
            Googleでログイン
          </button>
        )}
      </div>
  );
};