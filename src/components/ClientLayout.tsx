"use client"; // ✅ Ensures this runs only on the client side

import SolanaProvider from "@/components/SolanaProvider";
import Header from "@/components/Header";
import { GlobalProvider } from "@/context/Globalcontext"; // ✅ Import Global Context
import { ToastContainer, toast } from 'react-toastify';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider>
      <GlobalProvider>
        <Header />

        <main>{children}
          <ToastContainer position="bottom-right"
          />
        </main> {/* ✅ Wrapped content inside <main> */}
      </GlobalProvider>
    </SolanaProvider>
  );
}
