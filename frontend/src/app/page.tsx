"use client";
import React from "react";
import Image from "next/image";

export default function HypeGraphicPage() {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#05070a",
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "monospace",
      overflow: "hidden",
      position: "relative"
    }}>
      
      {/* Background Graphic Grid */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 2,
        opacity: 0.1,
        pointerEvents: "none"
      }}>
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
          <div key={n} style={{ position: "relative", width: "100%", height: "100%", aspectRatio: "1/1" }}>
            <Image src={`/samples/${n}.png`} alt="sneak" fill style={{ objectFit: "cover", filter: "blur(4px) brightness(0.5)" }} />
          </div>
        ))}
      </div>

      <div style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1000,
        width: "100%",
        padding: "60px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(5, 7, 10, 0.8)",
        backdropFilter: "blur(20px)",
        textAlign: "center",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
      }}>
        
        <div style={{ display: "inline-flex", gap: 12, marginBottom: 40 }}>
          <span style={{ padding: "6px 16px", background: "#ffffff", color: "#000", fontWeight: 800, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Bittensor EVM
          </span>
          <span style={{ padding: "6px 16px", border: "1px solid #ffffff", color: "#fff", fontWeight: 800, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Chain 964
          </span>
        </div>

        <h1 style={{
          fontSize: "clamp(80px, 12vw, 160px)", 
          fontWeight: 900, 
          letterSpacing: "-0.04em",
          lineHeight: 0.9,
          fontFamily: "Inter, sans-serif",
          textTransform: "uppercase",
          marginBottom: "24px",
          color: "#fff"
        }}>
          ?
        </h1>

        <div style={{ width: 80, height: 4, background: "#ffffff", margin: "0 auto 40px auto" }} />

        {/* Sneak Peek Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {[5,8,3].map(n => (
            <div key={n} style={{ border: "2px solid #333", overflow: "hidden", background: "#0a0a0a" }}>
               <Image 
                 src={`/samples/${n}.png`} 
                 alt="mystery cat" 
                 width={160} 
                 height={160} 
                 style={{ 
                   filter: "brightness(0) invert(1)", 
                   opacity: 0.8 
                 }} 
               />
            </div>
          ))}
        </div>

        <p style={{
          fontSize: "24px",
          fontWeight: 300,
          color: "#a1a1aa",
          maxWidth: 700,
          margin: "0 auto 20px auto",
          lineHeight: 1.6,
          letterSpacing: "0.02em"
        }}>
          4,699 pixel cats. Zero insider allocation. Zero team allocation.
          A pure permissionless fair launch.
        </p>

        <div style={{
          display: "inline-block",
          marginTop: 20,
          padding: "24px 48px",
          border: "2px dashed #ffffff",
          background: "rgba(255, 255, 255, 0.05)"
        }}>
          <h2 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.1em", color: "#fff", textTransform: "uppercase" }}>
            More details in <span style={{ color: "#ffffff" }}>10 HOURS</span>
          </h2>
        </div>

      </div>

    </div>
  );
}
