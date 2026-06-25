import { isGoogleConfigured } from "@/lib/auth";
import { LoginButtons } from "./LoginButtons";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo text-2xl font-extrabold text-white shadow-pop">
            A
          </div>
          <h1 className="mt-4 text-[24px] font-bold tracking-tight">ATLAS</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            AI Translation &amp; Localization Assistant
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6 shadow-card">
          <h2 className="text-[15px] font-bold">로그인 / 가입</h2>
          <p className="mb-5 mt-1 text-[12.5px] text-muted">
            계정으로 계속하면 워크스페이스에 접근합니다.
          </p>
          <LoginButtons googleConfigured={isGoogleConfigured} />
        </div>

        <p className="mt-5 text-center text-[11.5px] text-faint">
          © Superawesome · ATLAS
        </p>
      </div>
    </div>
  );
}
