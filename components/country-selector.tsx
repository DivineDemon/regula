"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES, getCountryByCode } from "@/lib/data/countries";
import { cn } from "@/lib/utils";

interface CountrySelectorProps {
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  maxDisplay?: number;
}

export function CountrySelector({
  value = [],
  onChange,
  disabled = false,
  placeholder = "Select countries...",
  className,
  maxDisplay = 3,
}: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  // Local state for managing selections before syncing to form
  const [localSelection, setLocalSelection] = React.useState<string[]>(value);

  // Sync local state when value prop changes (e.g., from form reset)
  React.useEffect(() => {
    setLocalSelection(value);
  }, [value]);

  const handleSelect = (countryCode: string) => {
    setLocalSelection((prev) => {
      if (prev.includes(countryCode)) {
        return prev.filter((c) => c !== countryCode);
      }
      return [...prev, countryCode];
    });
  };

  const handleDone = () => {
    onChange(localSelection);
    setOpen(false);
  };

  const handleCancel = () => {
    // Reset local state to original value
    setLocalSelection(value);
    setOpen(false);
  };

  // For button display: use value (synced with form) - shows committed selections
  const selectedCountriesForDisplay = value
    .map((code) => getCountryByCode(code))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const displayedCountries = selectedCountriesForDisplay.slice(0, maxDisplay);
  const remainingCount = selectedCountriesForDisplay.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-10 h-auto",
            !value.length && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 items-center">
            {value.length === 0 ? (
              <span>{placeholder}</span>
            ) : (
              <>
                {displayedCountries.map((country) => (
                  <Badge
                    key={country.code}
                    variant="secondary"
                    className="mr-1 gap-1"
                  >
                    {country.name}
                    {/* biome-ignore lint/a11y/useSemanticElements: Using span for styling flexibility within Badge component */}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:opacity-70"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange(value.filter((c) => c !== country.code));
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(value.filter((c) => c !== country.code));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value.length > 0 && (
              // biome-ignore lint/a11y/useSemanticElements: Using span for styling flexibility within Button component
              <span
                role="button"
                tabIndex={0}
                className={cn(
                  "p-1 hover:bg-accent rounded cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                onClick={(e) => {
                  if (disabled) return;
                  e.stopPropagation();
                  onChange([]);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search countries..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {COUNTRIES.filter(
                (country) =>
                  country.name
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                  country.code
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
              ).map((country) => {
                const isSelected = localSelection.includes(country.code);
                return (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => handleSelect(country.code)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {country.code}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-2 space-y-2">
          <div className="text-center text-xs text-muted-foreground">
            {localSelection.length} countr
            {localSelection.length === 1 ? "y" : "ies"} selected
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1"
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDone}
              className="flex-1"
              disabled={disabled}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
