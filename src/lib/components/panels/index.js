// Map id muc (SECTIONS[i].id) -> component noi dung panel.
import AboutPanel from './AboutPanel.svelte';
import TechPanel from './TechPanel.svelte';
import ProjectsPanel from './ProjectsPanel.svelte';
import WorkPanel from './WorkPanel.svelte';

export const PANELS = {
  about: AboutPanel,
  tech: TechPanel,
  project: ProjectsPanel,
  work: WorkPanel
};
