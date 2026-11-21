import { redirect } from 'next/navigation'

// Picture Day now lives inside the main app shell (Games tab → Picture day card).
// This route redirects back to the home page.
export default function PictureDayRedirect() {
  redirect('/')
}
