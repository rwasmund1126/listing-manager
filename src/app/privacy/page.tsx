export default function PrivacyPage() {
  return (
    <div className="prose max-w-2xl">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <h2>Information We Collect</h2>
      <p>
        This application collects minimal information necessary to manage your marketplace listings:
      </p>
      <ul>
        <li>Item descriptions and images you provide</li>
        <li>eBay OAuth tokens to post listings on your behalf</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>
        Your information is used solely to create and manage listings on eBay and other marketplaces.
        We do not sell or share your data with third parties.
      </p>

      <h2>Data Storage</h2>
      <p>
        Data is stored securely in our database. OAuth tokens are stored encrypted and are only
        used to authenticate with eBay on your behalf.
      </p>

      <h2>Contact</h2>
      <p>
        For questions about this privacy policy, please contact the application administrator.
      </p>
    </div>
  )
}
