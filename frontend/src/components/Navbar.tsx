"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

        {/* Links Container - Always visible now, squeezed tighter */}
        <div style={{ 
          display:"flex", alignItems:"center", gap:8, flex: 1, justifyContent: "center", overflowX:"auto", scrollbarWidth:"none" 
        }}>
          {links.map((l) => (
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
                color: pathname === l.href ? "#000" : "#9aa0ae",
                borderBottom: pathname === l.href ? "3px solid #00c49a" : "3px solid transparent" 
              }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Connect Button - Always visible */}
        <div style={{ flexShrink:0 }}>
          <ConnectButton />
        </div>

      </div>
    </nav>
  );
}
