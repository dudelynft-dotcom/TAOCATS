"use client";
import React from "react";
import Image from "next/image";

export default function HypeGraphicPage() {
  return (
    <div style={{ 
      width: "100%", minHeight: "100vh", background: "#0a0a0a", color: "#ffffff", padding: "4vw", 
      boxSizing: "border-box", display: "flex", flexDirection: "column", fontFamily: "monospace" 
    }}>
      <div style={{ 
        flex: 1, border: "2px solid #333", display: "flex", flexDirection: "column", background: "#000",
        boxShadow: "0 0 100px rgba(255,255,255,0.03)"
      }}>
        
        {/* HEADER BAR */}
        <div style={{ 
          borderBottom: "2px solid #333", display: "flex", justifyContent: "space-between", 
          padding: "24px 40px", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, fontSize: 12, color: "#888" 
        }}>
          <span>TAO CATS // GENESIS</span>
          <span>BITTENSOR EVM / CHAIN 964</span>
        </div>

        {/* HERO BODY */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "60px 0" }}>
          
          {/* MASSIVE BACKGROUND TEXT */}
          <div style={{ 
            position: "absolute", fontSize: "40vw", fontWeight: 900, color: "#0c0c0c", 
            zIndex: 0, lineHeight: 0.8, letterSpacing: "-0.05em", fontFamily: "Inter, sans-serif" 
          }}>
            ?
          </div>
          
          {/* PURE SNEAK PEEK GRID */}
          <div style={{ zIndex: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, background: "#333", border: "2px solid #333" }}>
            {[2, 5, 8, 12].map(n => (
              <div key={n} style={{ background: "#050505", width: "12vw", height: "12vw", minWidth: 150, minHeight: 150, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                 <Image src={`/samples/${n}.png`} alt="mystery cat" fill style={{ objectFit: "cover", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER BAR */}
        <div style={{ borderTop: "2px solid #333", display: "flex", padding: "2vw 40px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
           
           <div style={{ maxWidth: 600 }}>
             <h2 style={{ fontSize: "clamp(32px, 4vw, 56px)", fontWeight: 900, fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1 }}>
               4,699 PIXEL CATS.
             </h2>
             <p style={{ fontSize: 14, lineHeight: 1.8, color: "#a1a1aa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
               ZERO INSIDER ALLOCATION.<br/>
               ZERO TEAM ALLOCATION.<br/>
               A PURE PERMISSIONLESS FAIR LAUNCH.
             </p>
           </div>

           <div style={{ textAlign: "right" }}>
             <div style={{ fontSize: 12, color: "#666", marginBottom: 12, letterSpacing: "0.2em", fontWeight: 700 }}>
               SYSTEM STATUS: INCOMING
             </div>
             <div style={{ border: "2px dashed #fff", padding: "16px 32px", display: "inline-block", background: "rgba(255,255,255,0.02)" }}>
               <div style={{ fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 900, letterSpacing: "0.05em", fontFamily: "Inter, sans-serif", color: "#fff" }}>
                 MORE DETAILS IN 10 HOURS
               </div>
             </div>
           </div>

        </div>
      </div>
    </div>
  );
}
