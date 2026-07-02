"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase";

export default function RestaurantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("restaurant@demo.com");
  const [password, setPassword] = useState("restaurant123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createBrowserSupabase();

    try {
      if (supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError || !data.session) throw signInError ?? new Error("No session");
        const profileResponse = await fetch("/api/auth/session", {
          headers: { authorization: `Bearer ${data.session.access_token}` },
        });
        const profilePayload = await profileResponse.json();
        const role = profilePayload.profile?.role;
        if (role !== "restaurant" && role !== "admin") throw new Error("This account cannot access the portal.");
        window.localStorage.setItem("famfood-session", JSON.stringify({ role, email, token: data.session.access_token }));
        router.push(role === "admin" ? "/admin" : "/restaurant");
        return;
      }

      if (email === "restaurant@demo.com" && password === "restaurant123") {
        window.localStorage.setItem("famfood-session", JSON.stringify({ role: "restaurant", email }));
        router.push("/restaurant");
        return;
      }
      if (email === "admin@famfood.local" && password === "admin123") {
        window.localStorage.setItem("famfood-session", JSON.stringify({ role: "admin", email }));
        router.push("/admin");
        return;
      }
      setError("Use restaurant@demo.com / restaurant123 or admin@famfood.local / admin123 for local demo.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#043f4f] px-4 py-20">
      <form onSubmit={submit} className="w-full max-w-md bg-white p-8 shadow-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center bg-[#e7f7fa] text-[#07586b]">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="display-serif mt-5 text-4xl font-medium text-slate-950">Restaurant Login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Restaurant and admin accounts are routed automatically after login.
        </p>
        <div className="mt-6 space-y-4">
          <Input label="Email" value={email} onChange={setEmail} />
          <Input label="Password" type="password" value={password} onChange={setPassword} />
        </div>
        {error && <p className="mt-4 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={loading} className="ff-button ff-button-primary mt-6 w-full disabled:bg-slate-300">
          {loading ? "Logging in..." : "Login"}
        </button>
        <Link href="/restaurant-supply" className="mt-4 block text-center text-sm font-black text-[#07586b]">
          Apply for a restaurant account
        </Link>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} type={type} className="admin-input" />
    </label>
  );
}
