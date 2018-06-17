import * as React from 'react';
import { bindActionCreators } from 'redux';
import { connect, Dispatch } from 'react-redux';
import { Main, IProps } from 'components/Main';
import * as MainActions from 'actions/main';
import { IRootState } from 'types/root';

function mapStateToProps(state: IRootState): Partial<IProps> {
  return state.main;
}

function mapDispatchToProps(dispatch: Dispatch<IRootState>): Partial<IProps> {
  return bindActionCreators(MainActions as any, dispatch);
}

export default (connect(mapStateToProps, mapDispatchToProps)(Main) as any as React.StatelessComponent<IProps>);
