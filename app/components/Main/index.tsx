import * as React from 'react';
import { RouteComponentProps } from 'react-router';
// import { Link } from 'react-router-dom';
import { FormControl, Form, FormGroup, ControlLabel, Button, Checkbox, Alert, Glyphicon, Panel, ProgressBar, InputGroup } from 'react-bootstrap';
import '!style-loader!css-loader?sourceMap!bootstrap/dist/css/bootstrap.css';
import '!style-loader!css-loader?sourceMap!codemirror/lib/codemirror.css';
import * as ActionWorker from '../action.worker';
require('./regexMode');
import { remote } from 'electron';
import { IState, IFormState, ISearchStatus } from 'types/main';
import * as actions from 'actions/main';
const mainProcess = remote.require('./main.development');
require('./index.global.scss');
import CodeMirror, { detectMode } from './CodeMirror';
import { memoize } from 'utils/index';
import { debounce, throttle } from 'lodash';
import * as cn from 'classnames';
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized';

export type IProps = RouteComponentProps<any> & IState & typeof actions;
const MATCHES_ROW_HEIGHT = 50;

export class Main extends React.Component<IProps, {}> {
    __updateSearchStatus: (status: Partial<ISearchStatus>) => void;
    __worker = new (ActionWorker as ConstructorOf<Worker>)();
    __matchesContainerEl: Panel | null = null;
    __codeMirrors: { from?: any, to?: any } = {};

    render() {
        // const { /* increment, incrementIfOdd, incrementAsync, decrement, main */ } = this.props;
        const {
            from,
            to,
            where,
            occurrencesCount,
            filesCount,
            work,
            regex,
            matches,
            action,
            oldContent,
            progress,
            nonPrintableSymbols,
            caseSensitive,
            wholeWords,
            preserveCase
        } = this.props;

        const progressContent = occurrencesCount === undefined ? undefined :
            <div>
                <strong>{occurrencesCount}</strong> {action === 'find' ? 'occurrences' : 'replaces'} in <strong>{filesCount}</strong> files
                    {!work && action === 'replace' && occurrencesCount > 0 &&
                    // todo cancelling..
                    (oldContent ?
                        <a
                            href="javascript:void(0)"
                            style={{ display: 'inline-block', marginLeft: 10, color: '#337ab7', textDecoration: 'underline', fontWeight: 'bold' }}
                            onClick={this.__cancel}
                        >cancel</a> :
                        <span style={{ display: 'inline-block', marginLeft: 10, color: '#337ab7' }}>canceled</span>)}
            </div>;

        const mode = detectMode(!!regex, from);
        const fromIsNotValid = !!from && !!regex && (() => { try { new RegExp(from); return false; } catch (ex) { return true; } })();
        const disableActions = work || !from || fromIsNotValid;

        return (
            <Form style={{ padding: 10 }}>
                <Checkbox
                    checked={!!regex}
                    onChange={this.__updateFormFieldListener('checked', 'regex')}
                    inline
                > RegEx</Checkbox>
                <Checkbox
                    checked={!!nonPrintableSymbols}
                    onChange={this.__updateFormFieldListener('checked', 'nonPrintableSymbols')}
                    inline
                > Non printable symbols</Checkbox>
                <Checkbox
                    checked={!!caseSensitive}
                    onChange={this.__updateFormFieldListener('checked', 'caseSensitive')}
                    inline
                > Case sensitive</Checkbox>
                <Checkbox
                    checked={!!wholeWords}
                    onChange={this.__updateFormFieldListener('checked', 'wholeWords')}
                    inline
                > Whole words</Checkbox>
                <Checkbox
                    checked={!!preserveCase}
                    onChange={this.__updateFormFieldListener('checked', 'preserveCase')}
                    inline
                > Preserve Case</Checkbox>


                <FormGroup title={fromIsNotValid ? 'Regular expression is invalid!' : undefined}>
                    <ControlLabel>From</ControlLabel>
                    <CodeMirror
                        value={from}
                        mode={mode}
                        invalid={fromIsNotValid}
                        onChange={this.__updateFormFieldFn('from')}
                        nonPrintableSymbols={nonPrintableSymbols}
                    />
                </FormGroup>

                <FormGroup>
                    <ControlLabel>To</ControlLabel>
                    <CodeMirror
                        value={to}
                        mode={mode}
                        onChange={this.__updateFormFieldFn('to')}
                        nonPrintableSymbols={nonPrintableSymbols}
                    />
                </FormGroup>

                <FormGroup>
                    <ControlLabel>Where</ControlLabel>
                    <InputGroup>
                        <FormControl
                            value={where}
                            onChange={this.__updateFormFieldListener('value', 'where')}
                        ></FormControl>
                        <InputGroup.Button>
                            <Button onClick={this.__selectDirectory}>
                                <Glyphicon glyph="folder-open" />
                            </Button>
                        </InputGroup.Button>
                    </InputGroup>
                </FormGroup>

                <FormGroup>
                    {work ?
                        <Button bsStyle="warning" onClick={this.__stopAction}><Glyphicon glyph="ban-circle" /> Stop</Button> :
                        <>
                            <Button
                                bsStyle="primary"
                                onClick={this.__actionFn(false)}
                                disabled={disableActions}
                            ><Glyphicon glyph="search" /> Find</Button>{' '}
                            <Button
                                bsStyle="success"
                                onClick={this.__actionFn(true)}
                                disabled={disableActions}
                            ><Glyphicon glyph="file" /> Replace</Button>{' '}
                        </>
                    }
                </FormGroup>

                {progressContent &&
                    <FormGroup>
                        {work ?
                            <ProgressBar
                                className={cn('action-progress', progress !== 0 && progress !== null && 'animated')}
                                active
                                min={0}
                                max={1}
                                now={progress === null ? 1 : progress || 0}
                                label={progressContent}
                            /> :
                            <Alert bsStyle="success">{progressContent}</Alert>}
                    </FormGroup>}

                {!!matches.length &&
                    <Panel className="matches-container" ref={x => this.__matchesContainerEl = x}>
                        <Panel.Body className="matches-container-body">
                            <AutoSizer>
                                {({ width, height }) => (
                                    <List
                                        ref="List"
                                        // className={styles.List}
                                        height={height}
                                        // overscanRowCount={overscanRowCount}
                                        // noRowsRenderer={this._noRowsRenderer}
                                        rowCount={matches.length}
                                        rowHeight={MATCHES_ROW_HEIGHT}
                                        rowRenderer={this.__renderMatchesRow}
                                        // scrollToIndex={scrollToIndex}
                                        width={width}
                                    />
                                )}
                            </AutoSizer>
                        </Panel.Body>
                    </Panel>}
            </Form>
        );
    }

    constructor(props: Main['props']) {
        super(props);

        let accumulatedStatus: Partial<ISearchStatus> = {};
        const listener = (e: MessageEvent) => {
            const data = JSON.parse(e.data as string) as ActionWorker.IWorkerResponse;
            const matches = (accumulatedStatus.matches || []).concat(data.state.matches || []);
            accumulatedStatus = { ...accumulatedStatus, ...data.state, matches };
            update();
        };
        const update = throttle(() => {
            this.props.updateSearchStatus(accumulatedStatus);
            accumulatedStatus = {
                matches: accumulatedStatus.matches || this.props.matches
            };
        }, 100);

        this.__updateSearchStatus = (status: Partial<ISearchStatus>) => {
            update.flush();
            accumulatedStatus = {};
            this.props.updateSearchStatus(status);
        };

        this.__worker.addEventListener('message', listener);
    }

    componentDidMount() {
        if (this.props.from.length > 3) {
            this.__actionDebounced(false);
        }
    }

    componentDidUpdate(prevProps: Main['props']) {
        const propsToCheck: (keyof Main['props'])[] = ['caseSensitive', 'from', 'regex', 'where', 'wholeWords'];
        if (this.props.from.length > 3 && propsToCheck.some(prop => prevProps[prop] !== this.props[prop])) {
            this.__actionDebounced(false);
        }
    }

    __renderMatchesRow: ListRowRenderer = ({ index: i, style }) => {
        const { content, file } = this.props.matches[i];
        return (
            <div style={style} key={i} className="matches-row">
                <div><strong>{file}</strong></div>
                <div style={{ fontSize: 'smaller' }}>{content.split('\n').map((x, i) => <span key={i}>{x}<br /></span>)}</div>
            </div>
        );
    };

    __selectDirectory = () => {
        const directory = mainProcess.selectDirectory();
        if (directory && directory.length) {
            this.props.updateFormFields({ where: directory[0] });
        }
    };

    __action = (replace: boolean) => {
        this.__updateSearchStatus({
            occurrencesCount: 0,
            filesCount: 0,
            work: true,
            matches: [],
            action: replace ? 'replace' : 'find',
            oldContent: false,
            progress: 0
        });

        this.__worker.postMessage(JSON.stringify({
            type: 'work',
            replace,
            state: this.props
        } as ActionWorker.IWorkerData));
    };

    __actionFn = memoize((replace: boolean) => () => this.__action(replace));

    __actionDebounced = debounce(this.__action, 300);

    __cancel = () => {
        this.__worker.postMessage(JSON.stringify({
            type: 'cancel'
        } as ActionWorker.IWorkerData));
    };

    __updateFormFieldListener = memoize((property: 'value' | 'checked', field: keyof IFormState) =>
        (e: React.FormEvent<any>) => {
            this.props.updateFormFields({ [field]: (e.target as any)[property] });
        });

    __updateFormFieldFn = memoize(<K extends keyof IFormState>(field: K) =>
        (value: IFormState[K]) => {
            this.props.updateFormFields({ [field]: value });
        });

    // __scrollMatches = () => {
    //     if (this.__matchesContainerEl) {
    //         ReactDOM.findDOMNode(this.__matchesContainerEl).scrollTop = Number.MAX_SAFE_INTEGER;
    //     }
    // }

    __stopAction = () => {
        this.__worker.postMessage(JSON.stringify({
            type: 'stop'
        } as ActionWorker.IWorkerData));
    }
}

export default Main;
