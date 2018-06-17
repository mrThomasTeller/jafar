import * as cn from 'classnames';
import { Dictionary } from 'lodash';
import React = require("react");
import * as ReactCodeMirror from 'react-codemirror';
const highlightjs = require('highlightjs');
require('./index.global.scss');

export default class CodeMirror extends React.Component<{
    invalid?: boolean;
    mode?: string;
    value: string;
    nonPrintableSymbols?: boolean;
    onChange?: (value: string) => void;
}> {
    __codeMirrorObj: any;

    render(): JSX.Element {
        const { invalid, mode, value, nonPrintableSymbols, onChange } = this.props;

        const codeMirrorClass = cn('code-mirror-control', 'form-control', nonPrintableSymbols && 'show-non-printable');
        const codeMirrorOptions_ = codeMirrorOptions(mode);

        return (
            <ReactCodeMirror
                className={cn(codeMirrorClass, invalid && 'invalid')}
                value={value}
                onChange={onChange}
                options={codeMirrorOptions_}
                ref={(x: any) => this.__codeMirrorObj = x}
            />
        );
    }

    componentDidMount() {
        setTimeout(() => {
            if (this.__codeMirrorObj) {
                this.__codeMirrorObj.codeMirror.refresh();
            }
        }, 1000);
    }
};

export const detectMode = (regex: boolean, value: string) =>
    regex ? 'text/x-regex' : getCodeMirrorMode(highlightjs.highlightAuto(value).language);

const languagesMap: Dictionary<string | undefined> = {
    actionscript: 'javascript',
    apache: 'html'
};
const requireMap: Dictionary<string | undefined> = {
    typescript: 'javascript',
    html: 'htmlmixed'
};
const modesMap: Dictionary<string | undefined> = {
    php: 'x-php'
};

const getCodeMirrorMode = (language?: string) => {
    if (!language) {
        return language;
    }

    language = languagesMap[language] || language;
    const modeToRequire = requireMap[language] || language;
    const file = modeToRequire + '/' + modeToRequire;
    try {
        require('codemirror/mode/' + file);
    }
    catch (ex) {
        return undefined;
    }
    return 'text/' + (modesMap[language] || language);
};

const codeMirrorOptions = (mode?: string): ReactCodeMirror.ReactCodeMirrorProps['options'] => ({
    mode,
    ...({
        specialChars: /[ ]/
    } as any)
});