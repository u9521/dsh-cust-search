import { BASE_CSS } from './styles/base.ts'
import { CARD_CSS } from './styles/card.ts'
import { COMMON_CSS } from './styles/common.ts'
import { FOOTER_CSS } from './styles/footer.ts'
import { HEADER_CSS } from './styles/header.ts'
import { MODAL_CSS } from './styles/modal.ts'
import { SORT_CSS } from './styles/sort.ts'
import { TEST_MODAL_CSS } from './styles/test-modal.ts'

export const CSS = [
  BASE_CSS,
  COMMON_CSS,
  HEADER_CSS,
  CARD_CSS,
  SORT_CSS,
  FOOTER_CSS,
  MODAL_CSS,
  TEST_MODAL_CSS,
].join('\n\n')

export default CSS

export * from './styles/base.ts'
export * from './styles/card.ts'
export * from './styles/common.ts'
export * from './styles/footer.ts'
export * from './styles/header.ts'
export * from './styles/modal.ts'
export * from './styles/sort.ts'
export * from './styles/test-modal.ts'
