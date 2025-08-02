import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Box, Download, Moon, Sun, Menu, X } from "lucide-react";

interface HeaderProps {
  onDownload: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  environment: "sandbox" | "production";
}

export function Header({ onDownload, sidebarOpen, setSidebarOpen, environment }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-2 p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex-shrink-0 flex items-center">
              <Box className="h-6 w-6 sm:h-8 sm:w-8 text-primary mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">StablePay API</h1>
            </div>
            <div className="hidden md:block ml-8">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  environment === "production" 
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                }`}>
                  v1.0 Production
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Button onClick={onDownload} className="bg-primary text-white hover:bg-blue-700 text-sm sm:text-base px-2 sm:px-4">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Download Collection</span>
              <span className="sm:hidden">Download</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
