import Link from 'next/link'
import Head from 'next/head'

export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <Head>
        <title>404 - Page Not Found | AWS GenAI CICD Suite</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Head>
      <main className="text-center px-4">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="mb-8 text-lg">Oops! The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
          Go back to Home
        </Link>
      </main>
      <footer className="mt-8 text-sm text-gray-600">
        <p>AWS GenAI CICD Suite - AI-driven GitHub Actions for automated code reviews and more</p>
      </footer>
    </div>
  )
}
