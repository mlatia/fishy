"use client"
import { useState } from "react"
import { Fish, Download  } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
    const [activeTab, setActiveTab] = useState<"species" | "regional">("species")
    return (
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Fish className="w-6 h-6 text-white" />
            </div>
            <div>
            <h1 className="text-lg font-semibold text-gray-900">OceanMarine</h1>
            <p className="text-sm text-gray-500">Indonesian Marine Biodiversity Platform</p>
            </div>
        </div>

        </header>
    )
    }