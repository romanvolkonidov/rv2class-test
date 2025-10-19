/**
 * Annotation Button Component
 * Shows annotation button when screen share is active
 */

import React from 'react';
import { connect } from 'react-redux';

import { IReduxState } from '../../app/types';
import { translate } from '../../base/i18n/functions';
import { IconEdit } from '../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../base/toolbox/components/AbstractButton';
import { toggleAnnotations } from '../../annotations/actions';

interface IProps extends AbstractButtonProps {

    /**
     * Whether annotations are currently enabled.
     */
    _annotationsEnabled: boolean;
}

/**
 * Implementation of a button for accessing annotations.
 */
class AnnotationButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.annotations';
    override icon = IconEdit;
    override label = 'toolbar.annotations';
    override tooltip = 'toolbar.annotations';

    /**
     * Keeps the button visually toggled while annotations are active.
     *
     * @returns {boolean}
     */
    override _isToggled() {
        return this.props._annotationsEnabled;
    }

    /**
     * Handles clicking the button, and toggles annotations.
     *
     * @private
     * @returns {void}
     */
    override _handleClick() {
        const { dispatch } = this.props;

        dispatch(toggleAnnotations());
    }
}

const mapStateToProps = (state: IReduxState) => {
    const annotationsState = (state as any)['features/annotations'];

    return {
        _annotationsEnabled: Boolean(annotationsState?.enabled)
    };
};

export default translate(connect(mapStateToProps)(AnnotationButton));
