import { redirect } from 'next/navigation'

// The Picture Day game lives in src/components/PictureDayGame.tsx and is
// rendered inside the app shell via Games.tsx. Direct navigation here just
// goes back to the home page.
export default function PictureDayPage() {
  redirect('/')
}
