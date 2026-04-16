import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

if (typeof window !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger, SplitText)
}

export * from 'gsap'
export { ScrollTrigger, SplitText }
