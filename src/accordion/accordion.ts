import {
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from './accordion-parts';

/**
 * Аккордеон — секции настроек, FAQ:
 * <Accordion.Root type="single" collapsible><Accordion.Item value="a"><Accordion.Trigger>…</…><Accordion.Content>…
 */
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};
