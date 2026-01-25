"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import type { FintechService } from "@/lib/types/organization-profile";
import { cn } from "@/lib/utils";

const SERVICE_GROUPS: Record<string, FintechService[]> = {
  Payments: [
    "money_transfer",
    "payment_processing",
    "card_issuance",
    "wallet_services",
  ],
  Remittance: ["remittance", "fx_services"],
  Cryptocurrency: ["crypto_exchange", "crypto_wallet"],
  Banking: ["savings_account", "current_account"],
  Lending: ["lending", "bnpl", "p2p_lending"],
  Investment: ["investment_platform", "robo_advisor", "crowdfunding"],
  Insurance: ["insurance_distribution"],
  Other: ["other"],
};

const SERVICE_LABELS: Record<FintechService, string> = {
  money_transfer: "Money Transfer",
  payment_processing: "Payment Processing",
  card_issuance: "Card Issuance",
  wallet_services: "Wallet Services",
  remittance: "Remittance",
  fx_services: "Foreign Exchange",
  crypto_exchange: "Cryptocurrency Exchange",
  crypto_wallet: "Cryptocurrency Wallet",
  lending: "Lending",
  investment_platform: "Investment Platform",
  savings_account: "Savings Account",
  current_account: "Current Account",
  bnpl: "Buy Now Pay Later",
  crowdfunding: "Crowdfunding",
  p2p_lending: "Peer-to-Peer Lending",
  robo_advisor: "Robo-Advisory",
  insurance_distribution: "Insurance Distribution",
  other: "Other",
};

interface ServiceSelectorProps {
  value?: FintechService[];
  onChange: (value: FintechService[]) => void;
  disabled?: boolean;
}

export function ServiceSelector({
  value = [],
  onChange,
  disabled = false,
}: ServiceSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleToggle = (service: FintechService) => {
    if (value.includes(service)) {
      onChange(value.filter((s) => s !== service));
    } else {
      onChange([...value, service]);
    }
  };

  const filteredGroups = Object.entries(SERVICE_GROUPS).filter(([groupName]) =>
    groupName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-full flex flex-col items-start justify-start gap-5">
      <input
        type="text"
        value={searchTerm}
        placeholder="Search services..."
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="w-full h-full flex flex-col items-start justify-start gap-2.5 overflow-y-auto">
        {filteredGroups.map(([groupName, services]) => {
          const filteredServices = services.filter((service) =>
            SERVICE_LABELS[service]
              .toLowerCase()
              .includes(searchTerm.toLowerCase()),
          );

          if (filteredServices.length === 0) return null;

          return (
            <div
              key={groupName}
              className="w-full h-full flex flex-col items-center justify-center gap-2.5"
            >
              <span className="w-full text-left text-sm font-medium text-muted-foreground">
                {groupName}
              </span>
              {filteredServices.map((service) => {
                const isSelected = value.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-input hover:bg-accent",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => !disabled && handleToggle(service)}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-input",
                      )}
                    >
                      {isSelected && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {SERVICE_LABELS[service]}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
