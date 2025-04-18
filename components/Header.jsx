import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

const Header = ({ user }) => {
  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className="p-2 border-b flex justify-between items-center">
      {user ? (
        <>
          <span>{user.displayName} でログイン中</span>
          <button onClick={handleLogout} className="ml-4 text-blue-500">ログアウト</button>
        </>
      ) : (
        <span>未ログイン</span>
      )}
    </header>
  );
};

export default Header;
