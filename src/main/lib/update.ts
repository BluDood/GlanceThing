import axios from 'axios'

export async function getLatestVersion() {
  const res = await axios.get(
    'https://api.github.com/repos/BluDood/GlanceThing/releases/latest'
  )

  if (res.status !== 200) return null

  return {
    version: res.data.tag_name,
    downloadUrl: res.data.html_url
  }
}
