import { GlobalConfig } from 'payload/types';

const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'content',
      label:  'Content',
      type: 'text',
    },
  ],
}

export default Footer;