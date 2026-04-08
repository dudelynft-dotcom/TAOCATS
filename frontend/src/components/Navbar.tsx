"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import ConnectButton from "@/components/ConnectButton";

const ADMIN_OWNER = "0x198c2d42c71e8046f34eca9a0f5c81b9f3db2afb";

// Home is fully active; these three are locked until launch
const DISABLED = new Set(["/mint", "/marketplace", "/dashboard"]);

export default function Navbar() {
  const pathname = usePathname();
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === ADMIN_OWNER;
  const [toast, setToast] = useState(false);

  const showComingSoon = useCallback(() => {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }, []);

  const links = [
    { href: "/",            label: "Home" },
    { href: "/mint",        label: "Mint" },
    { href: "/marketplace", label: "Market" },
    { href: "/dashboard",   label: "Dashboard" },
  ];

  return (
    <>
      <nav style={{
        background: "rgba(255,255,255,0.9)",
        borderBottom: "2px solid #0f1419",
        backdropFilter: "blur(8px)",
        position:"fixed", top:0, left:0, right:0, zIndex:50
      }}>
        <div className="container-app" style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>

          <Link href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none", flexShrink:0 }}>
            <div style={{ width:32, height:32, background:"#0f1419", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:"1px solid #0f1419" }}>
              <Image src="/logo.png" alt="TAO CAT" width={26} height={26} style={{ width:26, height:26, objectFit:"contain" }} />
            </div>
            <span className="hide-mobile" style={{ fontWeight:800, fontSize:13, letterSpacing:"0.12em", color:"#0f1419", textTransform:"uppercase" }}>
              TAO<span style={{ color:"#5a6478" }}> CAT</span>
            </span>
          </Link>

          <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, justifyContent:"center", overflowX:"auto", scrollbarWidth:"none" }}>
            {isOwner && (
              <Link href="/admin"
                style={{
                  padding:"8px 0",
                  margin:"0 clamp(4px, 1.5vw, 12px)",
                  fontSize:"clamp(9px, 2.5vw, 11px)",
                  fontWeight:800,
                  letterSpacing:"0.08em",
                  textTransform:"uppercase",
                  textDecoration:"none",
                  whiteSpace:"nowrap",
                  color: pathname === "/admin" ? "#000" : "#9aa0ae",
                  borderBottom: pathname === "/admin" ? "3px solid #00c49a" : "3px solid transparent"
                }}>
                Admin
              </Link>
            )}
            {links.map((l) => {
              const disabled = DISABLED.has(l.href);
              const active   = pathname === l.href;

              if (disabled) {
                return (
                  <button
                    key={l.href}
                    onClick={showComingSoon}
                    style={{
                      background:"transparent", border:"none",
                      padding:"8px 0",
                      margin:"0 clamp(4px, 1.5vw, 12px)",
                      fontSize:"clamp(9px, 2.5vw, 11px)",
                      fontWeight:800,
                      letterSpacing:"0.08em",
                      textTransform:"uppercase",
                      whiteSpace:"nowrap",
                      color:"#9aa0ae",
                      opacity:0.5,
                      cursor:"not-allowed",
                      borderBottom:"3px solid transparent",
                    }}>
                    {l.label}
                  </button>
                );
              }

              return (
                <Link key={l.href} href={l.href}
                  style={{
                    padding:"8px 0",
                    margin:"0 clamp(4px, 1.5vw, 12px)",
                    fontSize:"clamp(9px, 2.5vw, 11px)",
                    fontWeight:800,
                    letterSpacing:"0.08em",
                    textTransform:"uppercase",
                    textDecoration:"none",
                    whiteSpace:"nowrap",
                    color: active ? "#000" : "#9aa0ae",
                    borderBottom: active ? "3px solid #00c49a" : "3px solid transparent"
                  }}>
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div style={{ flexShrink:0 }}>
            <ConnectButton />
          </div>

        </div>
      </nav>

      {/* Coming soon toast */}
      <div style={{
        position:"fixed", bottom:32, left:"50%", transform:"translate(-50%, 0)",
        background:"#0f1419", color:"#fff",
        padding:"10px 24px", fontSize:11, fontWeight:800, letterSpacing:"0.10em",
        textTransform:"uppercase", zIndex:9998, pointerEvents:"none",
        opacity: toast ? 1 : 0,
        transition:"opacity 0.25s ease",
      }}>
        Coming Soon
      </div>
    </>
  );
}
