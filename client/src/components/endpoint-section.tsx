import { Card, CardContent } from "@/components/ui/card";
import { HttpMethod } from "@/components/ui/http-method";
import { CodeBlock } from "@/components/ui/code-block";

interface EndpointSectionProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  title: string;
  description: string;
  endpoint: string;
  headers?: string[];
  requestBody?: any;
  response: any;
  additionalInfo?: React.ReactNode;
}

export function EndpointSection({
  method,
  title,
  description,
  endpoint,
  headers,
  requestBody,
  response,
  additionalInfo
}: EndpointSectionProps) {
  return (
    <div className="mb-12">
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center mb-6">
            <HttpMethod method={method} className="mr-0 sm:mr-4 mb-2 sm:mb-0" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm sm:text-base">{description}</p>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Endpoint</h3>
              <CodeBlock code={endpoint} variant="light" />
            </div>

            {headers && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Headers</h3>
                <CodeBlock code={headers.join("\n")} variant="light" />
              </div>
            )}

            {requestBody && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Request Body</h3>
                <CodeBlock code={JSON.stringify(requestBody, null, 2)} />
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Response</h3>
              <CodeBlock code={JSON.stringify(response, null, 2)} />
            </div>

            {additionalInfo && additionalInfo}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
