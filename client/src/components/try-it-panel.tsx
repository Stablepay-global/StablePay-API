import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HttpMethod } from '@/components/ui/http-method';
import { CodeBlock } from '@/components/ui/code-block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Copy, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { ApiEndpoint } from '@/lib/api-endpoints';
import { getEnvironmentConfig } from '@/lib/environment-config';
import { cn } from '@/lib/utils';

interface TryItPanelProps {
  endpoint: ApiEndpoint;
  environment: 'sandbox' | 'production';
  className?: string;
}

interface RequestState {
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: string;
}

interface ResponseState {
  status: number;
  headers: Record<string, string>;
  body: string;
  time: number;
  error?: string;
}

export function TryItPanel({ endpoint, environment, className }: TryItPanelProps) {
  const envConfig = getEnvironmentConfig(environment);
  
  const [requestState, setRequestState] = React.useState<RequestState>(() => {
    // Initialize with default values
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add default Authorization header if endpoint requires auth
    if (endpoint.requiresAuth) {
      headers['Authorization'] = `${envConfig.apiKeyPrefix}your_api_key_here`;
    }
    
    const queryParams: Record<string, string> = {};
    if (endpoint.queryParams) {
      Object.entries(endpoint.queryParams).forEach(([key, value]) => {
        if (typeof value === 'string') queryParams[key] = value;
      });
    }
    
    let body = '';
      if (endpoint.requestBody) {
        // Add sessionId and userId default values for KYC session create endpoint
        if (endpoint.url === '/api/v1/kyc/session/create') {
          const bodyObj = { ...endpoint.requestBody, sessionId: 'your_session_id_here', userId: 'your_user_id_here' };
          body = JSON.stringify(bodyObj, null, 2);
        } else {
          body = JSON.stringify(endpoint.requestBody, null, 2);
        }
      }
    
    return { headers, queryParams, body };
  });
  
  
  
  
  
  

  const [responseState, setResponseState] = useState<ResponseState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset request state when endpoint changes
  useEffect(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add default Authorization header if endpoint requires auth
    if (endpoint.requiresAuth) {
      headers['Authorization'] = `${envConfig.apiKeyPrefix}your_api_key_here`;
    }
    
    const queryParams: Record<string, string> = {};
    if (endpoint.queryParams) {
      Object.entries(endpoint.queryParams).forEach(([key, value]) => {
        if (typeof value === 'string') queryParams[key] = value;
      });
    }
    
    let body = '';
    if (endpoint.requestBody) {
      body = JSON.stringify(endpoint.requestBody, null, 2);
    }
    
    setRequestState({ headers, queryParams, body });
    setResponseState(null);
  }, [endpoint, environment, envConfig.apiKeyPrefix]);

  const baseUrl = envConfig.apiBaseUrl;

  const buildUrl = () => {
    let url = `${baseUrl}${endpoint.url}`;
    if (endpoint.queryParams && Object.keys(requestState.queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(requestState.queryParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      url += `?${params.toString()}`;
    }
    return url;
  };

  const generateCurl = () => {
    let curl = `curl -X ${endpoint.method} "${buildUrl()}"`;
    
    // Add headers
    Object.entries(requestState.headers).forEach(([key, value]) => {
      if (value) {
        // Auto-add Bearer prefix to Authorization header if missing
        let headerValue = value;
        if (key === 'Authorization' && value && !value.startsWith('Bearer ')) {
          headerValue = `Bearer ${value}`;
        }
        curl += ` \\\n  -H "${key}: ${headerValue}"`;
      }
    });
    
    // Add body for POST/PUT requests
    if (endpoint.method !== 'GET' && requestState.body) {
      curl += ` \\\n  -d '${requestState.body.replace(/'/g, "\\'")}'`;
    }
    
    return curl;
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseState(null);
    try {
      const url = buildUrl();
      const headers: Record<string, string> = {};
      Object.entries(requestState.headers).forEach(([key, value]) => {
        if (value) {
          if (key === 'Authorization' && value && !value.startsWith('Bearer ')) {
            headers[key] = `Bearer ${value}`;
          } else {
            headers[key] = value;
          }
        }
      });
      headers['x-sp-environment'] = environment;

      // Patch: Only send the correct fields for KYC endpoints
      let bodyToSend = requestState.body;
      try {
        const parsed = JSON.parse(requestState.body || '{}');
        // Map endpoint to allowed fields
        const kycFieldMap: Record<string, string[]> = {
          '/api/v1/kyc/aadhaar/generate-otp': ['sessionId', 'aadhaarNumber'],
          '/api/v1/kyc/aadhaar/verify': ['ref_id', 'otp', 'aadhaar_number'],
          '/api/v1/kyc/pan/verify': ['pan', 'name'],
          '/api/v1/kyc/bank/verify': ['account_number', 'ifsc', 'name'],
          '/api/v1/kyc/upi/verify': ['sessionId', 'upiId', 'name'],
          '/api/v1/kyc/face-liveness/verify': ['image', 'action'],
          '/api/v1/kyc/name-match/verify': ['name1', 'name2'],
          '/api/v1/kyc/session/create': ['sessionId', 'userId', 'documentType', 'documentNumber', 'holderName'],
        };
        const allowed = kycFieldMap[endpoint.url];
        if (allowed) {
          const filtered: Record<string, any> = {};
          allowed.forEach(f => { if (parsed[f] !== undefined) filtered[f] = parsed[f]; });
          bodyToSend = JSON.stringify(filtered);
        }
      } catch {}

      const startTime = Date.now();
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body: endpoint.method !== 'GET' && bodyToSend ? bodyToSend : undefined
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      let responseBody = '';
      let text = await response.text();
      try {
        const data = JSON.parse(text);
        responseBody = JSON.stringify(data, null, 2);
      } catch {
        responseBody = text;
      }
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      setResponseState({
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
        time: responseTime
      });
    } catch (error) {
      setResponseState({
        status: 0,
        headers: {},
        body: '',
        time: 0,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const updateHeader = (key: string, value: string) => {
    setRequestState(prev => ({
      ...prev,
      headers: { ...prev.headers, [key]: value }
    }));
  };

  const updateQueryParam = (key: string, value: string) => {
    setRequestState(prev => ({
      ...prev,
      queryParams: { ...prev.queryParams, [key]: value }
    }));
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Request Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HttpMethod method={endpoint.method} />
              <CardTitle className="text-lg">{endpoint.name}</CardTitle>
              <Badge variant="outline">{envConfig.name}</Badge>
            </div>
            <Button 
              onClick={handleSendRequest} 
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {endpoint.description}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* URL Display */}
          <div>
            <Label className="text-sm font-medium">Request URL</Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input 
                value={buildUrl()} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(buildUrl())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="headers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="params" disabled={!endpoint.queryParams || Object.keys(endpoint.queryParams).length === 0}>
                Query Params
              </TabsTrigger>
              <TabsTrigger value="body" disabled={!endpoint.requestBody}>
                Body
              </TabsTrigger>
            </TabsList>

            <TabsContent value="headers" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Content-Type</Label>
                  <Input
                    value={requestState.headers['Content-Type'] || ''}
                    onChange={(e) => updateHeader('Content-Type', e.target.value)}
                    placeholder="application/json"
                  />
                </div>
                {endpoint.requiresAuth && (
                  <div>
                    <Label className="text-sm font-medium">Authorization</Label>
                    <Input
                      value={requestState.headers['Authorization'] || ''}
                      onChange={(e) => updateHeader('Authorization', e.target.value)}
                      placeholder={`${envConfig.apiKeyPrefix}your_api_key_here`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your API key (Bearer prefix will be added automatically)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="params" className="space-y-4">
              {endpoint.queryParams && Object.keys(endpoint.queryParams).map((key) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-medium">{key}</Label>
                  <Input
                    value={requestState.queryParams[key] || ''}
                    onChange={(e) => updateQueryParam(key, e.target.value)}
                    placeholder={endpoint.queryParams ? endpoint.queryParams[key] as string : ''}
                  />
                </div>
              ))}
            </TabsContent>

          <TabsContent value="body" className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Request Body (JSON)</Label>
              {endpoint.url === '/api/v1/kyc/session/create' && (
                <div className="mb-4">
                  <Label htmlFor="sessionId" className="block text-sm font-medium text-gray-700">
                    Session ID
                  </Label>
                  <Input
                    id="sessionId"
                    type="text"
                    value={(() => {
                      try {
                        const parsed = JSON.parse(requestState.body);
                        return parsed.sessionId || '';
                      } catch {
                        return '';
                      }
                    })()}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(requestState.body);
                        parsed.sessionId = e.target.value;
                        setRequestState(prev => ({ ...prev, body: JSON.stringify(parsed, null, 2) }));
                      } catch {
                        // ignore parse error
                      }
                    }}
                    placeholder="Enter session ID"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              )}
              <Textarea
                value={requestState.body}
                onChange={(e) => setRequestState(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Enter JSON request body..."
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
          </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Section */}
      {responseState && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Response</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <Badge 
                    variant={responseState.status >= 200 && responseState.status < 300 ? "default" : "destructive"}
                    className={getStatusColor(responseState.status)}
                  >
                    {responseState.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Time:</span>
                  <span className="text-sm font-mono">{responseState.time}ms</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {responseState.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{responseState.error}</AlertDescription>
              </Alert>
            ) : (
              <Tabs defaultValue="body" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="body">Response Body</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="body" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Response Body</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(responseState.body)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <CodeBlock 
                    code={responseState.body} 
                    language="json"
                    className="max-h-[400px] overflow-auto"
                  />
                </TabsContent>

                <TabsContent value="curl" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">cURL Command</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generateCurl())}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <CodeBlock 
                    code={generateCurl()} 
                    language="bash"
                    className="max-h-[400px] overflow-auto"
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Example Response */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Example Response</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock 
            code={JSON.stringify(endpoint.responseExample, null, 2)} 
            language="json"
          />
        </CardContent>
      </Card>
    </div>
  );
} 