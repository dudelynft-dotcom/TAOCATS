"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ConnectButton";

const links = [
  { href: "/",            label: "Home" },
  { href: "/mint",        label: "Mint" },
  { href: "/marketplace", label: "Market" },
  { href: "/dashboard",   label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav style={{ background: "rgba(255,255,255,0.96)", borderBottom: "1px solid #e0e3ea", backdropFilter: "blur(12px)", position:"fixed", top:0, left:0, right:0, zIndex:50 }}>
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>

        <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <div style={{ width:32, height:32, borderRadius:2, background:"#0f1419", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
            <Image src="/logo.png" alt="TAO Cats" width={26} height={26} style={{ width:26, height:26, objectFit:"contain" }} />
          </div>
          <span style={{ fontWeight:700, fontSize:13, letterSpacing:"0.10em", color:"#0f1419", textTransform:"uppercase" }}>
            TAO<span style={{ color:"#00c49a" }}> CATS</span>
          </span>
        </Link>

        <div style={{ display:"flex", alignItems:"center" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              style={{ padding:"6px 14px", fontSize:11, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none", transition:"all 0.15s",
                color: pathname === l.href ? "#0f1419" : "#9aa0ae",
                borderBottom: pathname === l.href ? "2px solid #00c49a" : "2px solid transparent" }}>
              {l.label}
            </Link>
          ))}
        </div>

        <ConnectButton />
      </div>
    </nav>
  );
}
