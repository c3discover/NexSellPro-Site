/**
 * @fileoverview Custom Error page component for handling server and client-side errors
 * @author NexSellPro
 * @created 2024-03-27
 * @lastModified 2024-03-27
 * @description This component provides a user-friendly error page for both server and client-side errors,
 *              displaying appropriate error messages based on the status code.
 */

////////////////////////////////////////////////
// Imports:
////////////////////////////////////////////////
import { NextPage } from 'next';

////////////////////////////////////////////////
// Types and Interfaces:
////////////////////////////////////////////////
interface ErrorProps {
  /**
   * HTTP status code of the error
   * @optional
   */
  statusCode?: number;
}

////////////////////////////////////////////////
// Constants:
////////////////////////////////////////////////
const ERROR_MESSAGES = {
  404: 'Page not found',
  500: 'Internal server error',
  default: 'An unexpected error occurred',
};

////////////////////////////////////////////////
// Page Component:
////////////////////////////////////////////////
const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  ////////////////////////////////////////////////
  // State and Hooks:
  ////////////////////////////////////////////////
  // No state or hooks needed for this page

  ////////////////////////////////////////////////
  // Data Fetching:
  ////////////////////////////////////////////////
  // No data fetching needed for this page
  // export async function getStaticProps() {}
  // export async function getServerSideProps() {}

  ////////////////////////////////////////////////
  // Event Handlers:
  ////////////////////////////////////////////////
  // No event handlers needed for this page

  ////////////////////////////////////////////////
  // Helper Functions:
  ////////////////////////////////////////////////
  const getErrorMessage = (code?: number): string => {
    if (!code) return ERROR_MESSAGES.default;
    return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default;
  };

  ////////////////////////////////////////////////
  // Render Methods:
  ////////////////////////////////////////////////
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {statusCode ? `Error ${statusCode}` : 'An error occurred'}
        </h1>
        <p className="text-gray-600 mb-8">
          {getErrorMessage(statusCode)}
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

////////////////////////////////////////////////
// Error Handling:
////////////////////////////////////////////////
Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

////////////////////////////////////////////////
// Export:
////////////////////////////////////////////////
export default Error; 