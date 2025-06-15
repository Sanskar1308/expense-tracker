'use client';

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="p-8 bg-gray-800 rounded-lg shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <button
          onClick={() => signIn("github")}
          className="w-full py-2 px-4 bg-white text-black font-semibold rounded hover:bg-gray-200"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
