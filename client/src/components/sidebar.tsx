import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HttpMethod } from "@/components/ui/http-method";
import { 
  Users, 
  Shield, 
  Calculator, 
  ArrowRightLeft, 
  Bell, 
  ChevronDown, 
  Settings,
  Rocket,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, getEndpointsByCategory } from "@/lib/api-endpoints";
import { getEnvironmentConfig } from "@/lib/environment-config";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  environment: "sandbox" | "production";
  setEnvironment: (env: "sandbox" | "production") => void;
}

interface NavSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: NavItem[];
}

interface NavItem {
  id: string;
  title: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
}

// Icon mapping for categories
const categoryIcons: Record<string, any> = {
  'Partner Management': Users,
  'Session Management': Shield,
  'KYC Management': Shield,
  'Quote Management': Calculator,
  'Transaction Management': ArrowRightLeft,
  'Analytics': Activity,
  'System': Activity
};

const categoryColors: Record<string, string> = {
  'Partner Management': 'text-blue-500',
  'Session Management': 'text-green-500',
  'KYC Management': 'text-green-500',
  'Quote Management': 'text-yellow-500',
  'Transaction Management': 'text-purple-500',
  'Analytics': 'text-pink-500',
  'System': 'text-gray-500'
};

// Generate nav sections from API endpoints
const generateNavSections = (): NavSection[] => {
  const categories = getEndpointsByCategory();
  const sections: NavSection[] = [];

  Object.entries(categories).forEach(([category, endpoints]) => {
    const IconComponent = categoryIcons[category] || Activity;
    const color = categoryColors[category] || 'text-gray-500';

    sections.push({
      id: category.toLowerCase().replace(/\s+/g, '-'),
      title: category,
      icon: IconComponent,
      color,
      items: endpoints.map(endpoint => ({
        id: endpoint.id,
        title: endpoint.name,
        method: endpoint.method
      }))
    });
  });

  return sections;
};

const navSections = generateNavSections();

export function Sidebar({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen, environment, setEnvironment }: SidebarProps) {
  const envConfig = getEnvironmentConfig(environment);
  
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Auto-expand all sections by default
    return navSections.map(section => section.id);
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSectionSelect = (section: string) => {
    setActiveSection(section);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transform transition-transform duration-300 ease-in-out lg:transform-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            API Documentation
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Interactive API reference with live testing
          </p>
        </div>

        {/* Environment Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Settings className="h-4 w-4 mr-2 text-gray-500" />
            Environment
          </h3>
          <div className="flex space-x-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1",
                environment === "sandbox" 
                  ? "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                  : "hover:bg-blue-50 dark:hover:bg-blue-900 text-gray-600 dark:text-gray-300"
              )}
              onClick={() => setEnvironment("sandbox")}
            >
              Sandbox
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex-1",
                environment === "production" 
                  ? "bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 border-green-200 dark:border-green-700"
                  : "hover:bg-green-50 dark:hover:bg-green-900 text-gray-600 dark:text-gray-300"
              )}
              onClick={() => setEnvironment("production")}
            >
              Production
            </Button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-300">Base URL</span>
              <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {envConfig.apiBaseUrl.replace('http://', '').replace('https://', '')}
              </code>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 dark:text-gray-300">API Key</span>
              <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                {envConfig.apiKeyPrefix}...
              </code>
            </div>
          </div>
          
          {/* Environment-specific download buttons */}
          <div className="mt-3 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const event = new CustomEvent('downloadCollection', { detail: { environment: 'sandbox' } });
                window.dispatchEvent(event);
              }}
            >
              Download Sandbox Collection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const event = new CustomEvent('downloadCollection', { detail: { environment } });
                window.dispatchEvent(event);
              }}
            >
              Download Production Collection
            </Button>
          </div>
        </div>
        {/* Navigation Tree */}
        <nav className="space-y-2">
          <Button
            variant={activeSection === "overview" ? "secondary" : "ghost"}
            className="w-full justify-start mb-4"
            onClick={() => handleSectionSelect("overview")}
          >
            Overview
          </Button>

          {navSections.map((section) => {
            const IconComponent = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            
            return (
              <div key={section.id} className="api-section">
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center">
                    <IconComponent className={cn("h-4 w-4 mr-2", section.color)} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform",
                      isExpanded && "rotate-180"
                    )} 
                  />
                </Button>
                
                {isExpanded && (
                  <div className="ml-6 mt-2 space-y-1">
                    {section.items.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start p-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700",
                          activeSection === item.id && "bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                        )}
                        onClick={() => handleSectionSelect(item.id)}
                      >
                        <HttpMethod method={item.method} className="mr-2" />
                        {item.title}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
    </>
  );
}

