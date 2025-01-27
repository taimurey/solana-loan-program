"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { FaHome, FaLayerGroup, FaExchangeAlt, FaUser } from "react-icons/fa";
import { JSX } from "react";
import { useGlobalContext } from "@/context/Globalcontext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LuPanelRightClose } from "react-icons/lu";
export default function Header() {
    const { user, accounts, isLoading } = useGlobalContext();
    const { publicKey } = useWallet();
    const pathname = usePathname(); // ✅ Get the current route

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white">
            <div className="flex items-center space-x-2 gap-12">
                <div className="text-2xl font-bold flex items-center">
                    <LuPanelRightClose />
                    <span className="ml-2">Loan</span>
                </div>
                <nav className="hidden md:flex space-x-2">
                    <NavItem href="/" icon={<FaHome />} label="Pools" active={pathname === "/"} />
                    <NavItem href="/transactions" icon={<FaExchangeAlt />} label="Transactions" active={pathname === "/transactions"} />
                    {/* <NavItem href="/accounts" icon={<FaUser />} label="Accounts" active={pathname === "/accounts"} /> */}
                </nav>
            </div>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
                <WalletMultiButton className="bg-[#2463eb] px-3 py-2 rounded-xl" />
                {/* {publicKey && (
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        🏴
                    </div>
                )} */}
            </div>
        </header>
    );
}

// ✅ Updated NavItem to Highlight Active Page
const NavItem = ({ href, icon, label, active }: { href: string; icon: JSX.Element; label: string; active: boolean }) => (
    <Link
        href={href}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${active ? "bg-blue-500 text-white font-semibold" : "text-white hover:bg-blue-500"
            }`}
    >
        {icon}
        <span>{label}</span>
    </Link>
);
