"use client";

import { ReactNode } from "react";

interface SecondaryLayoutProps {
    title: string;
    description: string;
    children: ReactNode;
}



export default function SecondaryLayout({ title, description, children }: SecondaryLayoutProps) {
    return (
        <div className=" ">
            <div className=" mx-auto bg-[#2463eb] p-6  shadow-md pb-32">
                <h1 className="text-4xl font-bold mb-4 text-white">{title}</h1>
                <p className="text-white/80 mb-6 text-xl">{description}</p>
            </div>
            <div className="-mt-32 mx-6">{children}</div>
        </div>
    );
}