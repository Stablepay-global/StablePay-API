import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { TryItPanel } from "@/components/try-it-panel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Rocket, Check, Shield, Calculator, ArrowRightLeft, Bell, Activity, Zap } from "lucide-react";
import { API_ENDPOINTS, getEndpointById } from "@/lib/api-endpoints";

export default function Home() {
  const [location, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [environment, setEnvironment] = useState<"sandbox" | "production">(
    import.meta.env.DEV ? "sandbox" : "production"
  );
  const [notFoundInfo, setNotFoundInfo] = useState<{ url: string; endpointId: string; category: string } | null>(null);

  // Extract endpoint from URL and handle errors
  useEffect(() => {
    const pathParts = location.split('/').filter(Boolean);
    let found = false;
    if (pathParts.length >= 3 && pathParts[0] === 'api') {
      const category = pathParts[1];
      const endpointId = pathParts[2];
      const endpoint = getEndpointById(endpointId);
      if (endpoint) {
        setActiveSection(endpointId);
        setNotFoundInfo(null);
        found = true;
      } else {
        // Try to auto-correct: find endpoint by category
        const categoryEndpoints = API_ENDPOINTS.filter(e =>
          e.category.toLowerCase().replace(/\s+/g, '-') === category
        );
        if (categoryEndpoints.length > 0) {
          setActiveSection(categoryEndpoints[0].id);
          setNotFoundInfo(null);
          setLocation(`/api/${category}/${categoryEndpoints[0].id}`);
          found = true;
        } else {
          setNotFoundInfo({ url: location, endpointId, category });
        }
      }
    } else if (pathParts.length >= 2 && pathParts[0] === 'api') {
      const category = pathParts[1];
      const categoryEndpoints = API_ENDPOINTS.filter(e =>
        e.category.toLowerCase().replace(/\s+/g, '-') === category
      );
      if (categoryEndpoints.length > 0) {
        setActiveSection(categoryEndpoints[0].id);
        setNotFoundInfo(null);
        setLocation(`/api/${category}/${categoryEndpoints[0].id}`);
        found = true;
      } else {
        setNotFoundInfo({ url: location, endpointId: "", category });
      }
    } else {
      setActiveSection("overview");
      setNotFoundInfo(null);
      found = true;
    }
    // Debug log
    // eslint-disable-next-line no-console
    console.log("[ROUTER DEBUG]", { location, pathParts, found, activeSection, notFoundInfo });
  }, [location, setLocation]);

  // Update URL when activeSection changes
  useEffect(() => {
    if (activeSection === "overview") {
      setLocation("/");
    } else {
      const endpoint = getEndpointById(activeSection);
      if (endpoint) {
        const categorySlug = endpoint.category.toLowerCase().replace(/\s+/g, '-');
        setLocation(`/api/${categorySlug}/${endpoint.id}`);
      }
    }
  }, [activeSection, setLocation]);

  const handleDownloadCollection = async (environment: "sandbox" | "production" = "production") => {
    try {
      const response = await fetch(`/api/v1/postman/collection?environment=${environment}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `StablePay-${environment.charAt(0).toUpperCase() + environment.slice(1)}-API-Collection-v8.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading collection:", error);
    }
  };

  useEffect(() => {
    const handleDownloadEvent = (event: CustomEvent<{ environment: "sandbox" | "production" }>) => {
      handleDownloadCollection(event.detail.environment);
    };

    window.addEventListener('downloadCollection', handleDownloadEvent as EventListener);
    return () => {
      window.removeEventListener('downloadCollection', handleDownloadEvent as EventListener);
    };
  }, []);

  const currentEndpoint = getEndpointById(activeSection);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Header 
        onDownload={() => handleDownloadCollection(environment)} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen}
        environment={environment}
      />
      
      <div className="flex pt-16">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          environment={environment}
          setEnvironment={setEnvironment}
        />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 lg:ml-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {activeSection === "overview" && (
              <div className="mb-12">
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                        <Rocket className="text-blue-600 dark:text-blue-300 h-8 w-8" />
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          StablePay API Documentation
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                          Interactive API reference with live testing capabilities
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          🎯 What's Included
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <li className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Interactive API testing directly in browser
                          </li>
                          <li className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Real-time request/response viewing
                          </li>
                          <li className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Automatic cURL generation
                          </li>
                          <li className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Sandbox & Production environments
                          </li>
                          <li className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            Complete API reference
                          </li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          🔧 Core Features
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <li className="flex items-center">
                            <Shield className="h-4 w-4 text-green-500 mr-2" />
                            Partner onboarding & API key generation
                          </li>
                          <li className="flex items-center">
                            <Calculator className="h-4 w-4 text-blue-500 mr-2" />
                            Real-time USD-INR quotes with fees
                          </li>
                          <li className="flex items-center">
                            <ArrowRightLeft className="h-4 w-4 text-yellow-500 mr-2" />
                            USDC transaction management
                          </li>
                          <li className="flex items-center">
                            <Activity className="h-4 w-4 text-red-500 mr-2" />
                            Comprehensive KYC verification
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                        <Zap className="h-5 w-5 mr-2" />
                        🚀 Interactive API Testing
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 mb-4">
                        Test any API endpoint directly from this documentation:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                        <li>Select an endpoint from the sidebar</li>
                        <li>Choose your environment (Sandbox/Production)</li>
                        <li>Fill in the required parameters</li>
                        <li>Click "Send Request" to test live</li>
                        <li>View real-time response and cURL command</li>
                        <li>Copy responses for integration</li>
                      </ol>
                    </div>

                    <div className="mt-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                        📊 API Statistics
                    </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-300">
                            {API_ENDPOINTS.length}
                    </div>
                          <div className="text-green-700 dark:text-green-200">Endpoints</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                            {new Set(API_ENDPOINTS.map(e => e.category)).size}
                      </div>
                          <div className="text-blue-700 dark:text-blue-200">Categories</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                            {API_ENDPOINTS.filter(e => e.requiresAuth).length}
                      </div>
                          <div className="text-purple-700 dark:text-purple-200">Authenticated</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600 dark:text-orange-300">
                            {API_ENDPOINTS.filter(e => !e.requiresAuth).length}
                      </div>
                          <div className="text-orange-700 dark:text-orange-200">Public</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentEndpoint && (
              <TryItPanel 
                endpoint={currentEndpoint} 
                environment={environment}
              />
            )}

            {!currentEndpoint && activeSection !== "overview" && (
              <div className="mb-12">
                <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <h2 className="text-xl font-semibold mb-2">Endpoint Not Found</h2>
                      <p>
                        The selected endpoint could not be found.<br />
                        <b>URL:</b> {notFoundInfo?.url}<br />
                        <b>Endpoint ID:</b> {notFoundInfo?.endpointId}<br />
                        <b>Category:</b> {notFoundInfo?.category}<br />
                        Please check the sidebar for available endpoints.<br />
                        If you believe this is a bug, check your <code>API_ENDPOINTS</code> config and sidebar logic.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
