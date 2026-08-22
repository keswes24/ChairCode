import Image from "next/image";
import ZoneDiagram from "./ZoneDiagram";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-form-side">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Image
            src="/chaircode-logo.webp"
            alt="ChairCode"
            width={140}
            height={140}
            priority
            style={{ width: 140, height: 140, margin: "0 auto" }}
          />
        </div>
        <div className="auth-card">{children}</div>
      </div>
      <div className="auth-diagram-side">
        <ZoneDiagram />
      </div>
    </div>
  );
}
