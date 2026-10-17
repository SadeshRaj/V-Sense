import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import {
    IconShield,
    IconCar,
    IconWrench,
    IconCheckCircle,
    IconXCircle,
    IconClock,
    IconSearch,
    IconFileText,
    IconUpload,
    IconBuilding,
    IconLogOut,
    IconEye,
    IconExternalLink,
    IconAlertTriangle,
    IconPlus,
    IconImage,
    IconUser,
    IconPhone,
    IconMail,
    IconMapPin,
    IconRefresh,
} from '../../src/components/Icons';

const icons = [
    ['IconShield', IconShield],
    ['IconCar', IconCar],
    ['IconWrench', IconWrench],
    ['IconCheckCircle', IconCheckCircle],
    ['IconXCircle', IconXCircle],
    ['IconClock', IconClock],
    ['IconSearch', IconSearch],
    ['IconFileText', IconFileText],
    ['IconUpload', IconUpload],
    ['IconBuilding', IconBuilding],
    ['IconLogOut', IconLogOut],
    ['IconEye', IconEye],
    ['IconExternalLink', IconExternalLink],
    ['IconAlertTriangle', IconAlertTriangle],
    ['IconPlus', IconPlus],
    ['IconImage', IconImage],
    ['IconUser', IconUser],
    ['IconPhone', IconPhone],
    ['IconMail', IconMail],
    ['IconMapPin', IconMapPin],
    ['IconRefresh', IconRefresh],
];

describe('Icons component library', () => {
    it.each(icons)('%s renders an SVG element', (name, IconComponent) => {
        const { container } = render(<IconComponent />);
        const svg = container.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
        expect(svg).toHaveAttribute('fill', 'none');
        expect(svg).toHaveAttribute('stroke', 'currentColor');
        expect(svg).toHaveAttribute('stroke-width', '2');
    });

    it.each(icons)('%s applies the default CSS class', (name, IconComponent) => {
        const { container } = render(<IconComponent />);

        expect(container.querySelector('svg')).toHaveClass('w-5', 'h-5');
    });

    it.each(icons)('%s accepts a custom CSS class', (name, IconComponent) => {
        const { container } = render(
            <IconComponent className="custom-icon test-size" />
        );

        expect(container.querySelector('svg')).toHaveClass(
            'custom-icon',
            'test-size'
        );
        expect(container.querySelector('svg')).not.toHaveClass('w-5');
    });

    it.each(icons)('%s renders at least one SVG path', (name, IconComponent) => {
        const { container } = render(<IconComponent />);

        expect(container.querySelectorAll('svg path').length).toBeGreaterThan(0);
    });

    it('renders multiple different icons together', () => {
        const { container } = render(
            <div>
                <IconShield />
                <IconCar />
                <IconSearch />
                <IconUser />
                <IconRefresh />
            </div>
        );

        expect(container.querySelectorAll('svg')).toHaveLength(5);
        expect(container.querySelectorAll('svg path').length).toBeGreaterThanOrEqual(5);
    });

    it('does not require props to render an icon', () => {
        const { container } = render(<IconCheckCircle />);

        expect(container.querySelector('svg')).toBeInTheDocument();
    });
});
