import React, { ComponentType } from 'react';

import BaseApp from '../../../base/app/components/BaseApp';
import GlobalStyles from '../../../base/ui/components/GlobalStyles.web';
import JitsiThemeProvider from '../../../base/ui/components/JitsiThemeProvider.web';

import StudentHomeworkPage from './StudentHomeworkPage';

type Props = {
    /**
     * Indicates the style type that needs to be applied.
     */
    styleType?: string;
};

/**
 * Wrapper application for student homework.
 *
 * @augments BaseApp
 */
export default class StudentHomeworkApp extends BaseApp<Props> {

    /**
     * Navigates to {@link StudentHomeworkPage} upon mount.
     *
     * @returns {void}
     */
    override async componentDidMount() {
        await super.componentDidMount();

        const { styleType } = this.props;

        super._navigate({
            component: StudentHomeworkPage,
            props: {
                className: styleType
            }
        });
    }

    /**
     * Overrides the parent method to inject {@link JitsiThemeProvider} as
     * the top most component.
     *
     * @override
     */
    override _createMainElement(component: ComponentType<any>, props: Object) {
        return (
            <JitsiThemeProvider>
                <GlobalStyles />
                { super._createMainElement(component, props) }
            </JitsiThemeProvider>
        );
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        return super.render();
    }
}
