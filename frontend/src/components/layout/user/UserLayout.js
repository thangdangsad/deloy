// src/components/layout/user/UserLayout.js
import { Outlet } from "react-router-dom";
import { useRef } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatWidget from "../../chat/ChatWidget";

export default function UserLayout() {
  const chatWidgetRef = useRef(null);

  return (
    <div className="user-layout">
      <Navbar />
      <main className="content">
        <Outlet context={{ chatWidgetRef }} /> {/* ✅ Pass ref to child routes */}
      </main>
      <Footer />
      <ChatWidget ref={chatWidgetRef} />
    </div>
  );
}
