import SectionHead from '@celo/react-components/components/SectionHead'
import ForwardChevron from '@celo/react-components/icons/ForwardChevron'
import QRCode from '@celo/react-components/icons/QRCode'
import colors from '@celo/react-components/styles/colors'
import { fontStyles } from '@celo/react-components/styles/fonts'
import { isValidAddress } from '@celo/utils/lib/src/signatureUtils'
import { parsePhoneNumber } from '@celo/utils/src/phoneNumbers'
import { RecipientKind } from '@celo/utils/src/recipient'
import { TranslationFunction } from 'i18next'
import * as React from 'react'
import { withNamespaces, WithNamespaces } from 'react-i18next'
import {
  ListRenderItemInfo,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { connect } from 'react-redux'
import { componentWithAnalytics } from 'src/analytics/wrapper'
import { Namespaces } from 'src/i18n'
import { AddressToE164NumberType } from 'src/identity/reducer'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { RootState } from 'src/redux/reducers'
import LabeledTextInput from 'src/send/LabeledTextInput'
import RecipientItem from 'src/send/RecipientItem'
import DisconnectBanner from 'src/shared/DisconnectBanner'
import {
  getRecipientFromAddress,
  NumberToRecipient,
  Recipient,
  RecipientWithAddress,
  RecipientWithMobileNumber,
} from 'src/utils/recipient'
import { assertUnreachable } from 'src/utils/typescript'

const goToQrCodeScreen = () => {
  navigate(Screens.QRCode)
}

const QRCodeCTA = ({ t }: { t: TranslationFunction }) => (
  <TouchableOpacity onPress={goToQrCodeScreen} style={style.qrcodeRow}>
    <View style={style.qrcodeIconLeft}>
      <QRCode />
    </View>
    <View style={style.qrcodeTextContainer}>
      <Text style={[fontStyles.bodySmallSemiBold, style.qrcodeText]}> {t('scanCode')} </Text>
      <Text style={[fontStyles.bodySmall, style.qrcodeText]}>{t('toSentOrRequestPayment')}</Text>
    </View>
    <ForwardChevron height={15} />
  </TouchableOpacity>
)

interface Section {
  key: string
  data: Recipient[]
}

interface Props {
  showQRCode: boolean
  searchQuery: string
  sections: Section[]
  defaultCountryCode: string
  onSelectRecipient(recipient: Recipient): void
  onSearchQueryChanged(searchQuery: string): void
}

interface StateProps {
  addressToE164Number: AddressToE164NumberType
  recipientCache: NumberToRecipient
}
type RecipientProps = Props & WithNamespaces & StateProps

const mapStateToProps = (state: RootState): StateProps => ({
  addressToE164Number: state.identity.addressToE164Number,
  recipientCache: state.send.recipientCache,
})

export class RecipientPicker extends React.Component<RecipientProps> {
  renderItem = ({ item, index }: ListRenderItemInfo<Recipient>) => (
    <RecipientItem recipient={item} onSelectRecipient={this.props.onSelectRecipient} />
  )

  renderSectionHeader = (info: { section: SectionListData<Section> }) => (
    <SectionHead text={info.section.key as string} />
  )

  keyExtractor = (item: Recipient, index: number) => {
    switch (item.kind) {
      case RecipientKind.Contact:
        return item.contactId + item.phoneNumberLabel + index
      case RecipientKind.MobileNumber:
        return item.e164PhoneNumber + index
      case RecipientKind.QrCode:
        return item.address + index
      case RecipientKind.Address:
        return item.address + index
      default:
        throw assertUnreachable(item)
    }
  }

  renderItemSeparator = () => <View style={style.separator} />

  renderFooter = () => (
    <>
      {this.renderItemSeparator()}
      <Text style={[fontStyles.subSmall, style.footer]}>{this.props.t('searchFriends')}</Text>
    </>
  )

  renderEmptyView = (
    addressToE164Number: AddressToE164NumberType,
    recipientCache: NumberToRecipient
  ) => {
    const parsedNumber = parsePhoneNumber(this.props.searchQuery, this.props.defaultCountryCode)
    if (parsedNumber) {
      return this.renderSendToPhoneNumber(parsedNumber.displayNumber, parsedNumber.e164Number)
    }
    if (isValidAddress(this.props.searchQuery)) {
      const existingContact = getRecipientFromAddress(
        this.props.searchQuery,
        addressToE164Number,
        recipientCache
      )

      if (existingContact) {
        return (
          <>
            <RecipientItem
              recipient={existingContact}
              onSelectRecipient={this.props.onSelectRecipient}
            />
            {this.renderItemSeparator()}
          </>
        )
      }

      return this.renderSendToAddress(this.props.searchQuery)
    }
    return this.renderNoContentEmptyView()
  }

  renderNoContentEmptyView = () => (
    <View style={style.emptyView}>
      <View style={style.emptyViewBody}>
        <Text style={fontStyles.body}>{this.props.t('noResultsFor')}</Text>
        <Text style={[fontStyles.body, style.emptyViewBodyDark]}>
          {` "${this.props.searchQuery}"`}
        </Text>
      </View>
      <Text style={[fontStyles.bodySmall, style.emptyViewBodySmall]}>
        {this.props.t('searchForSomeone')}
      </Text>
    </View>
  )

  renderSendToPhoneNumber = (displayKey: string, e164PhoneNumber: string) => {
    const { t } = this.props
    const recipient: RecipientWithMobileNumber = {
      kind: RecipientKind.MobileNumber,
      displayName: t('mobileNumber'),
      displayKey,
      e164PhoneNumber,
    }
    return (
      <>
        <RecipientItem recipient={recipient} onSelectRecipient={this.props.onSelectRecipient} />
        {this.renderItemSeparator()}
      </>
    )
  }

  renderSendToAddress = (address: string) => {
    const { t } = this.props
    const recipient: RecipientWithAddress = {
      kind: RecipientKind.Address,
      displayName: t('walletAddress'),
      displayKey: address.substring(2, 17) + '...',
      address,
    }
    return (
      <>
        <RecipientItem recipient={recipient} onSelectRecipient={this.props.onSelectRecipient} />
        {this.renderItemSeparator()}
      </>
    )
  }

  render() {
    const { sections, t, addressToE164Number, recipientCache } = this.props
    const showFooter = sections.length > 0

    return (
      <View style={style.body}>
        <DisconnectBanner />
        <LabeledTextInput
          keyboardType="default"
          placeholder={t('nameOrPhoneNumber')}
          value={this.props.searchQuery}
          onValueChanged={this.props.onSearchQueryChanged}
        />
        {this.props.showQRCode && <QRCodeCTA t={t} />}
        <SectionList
          renderItem={this.renderItem}
          renderSectionHeader={this.renderSectionHeader}
          sections={sections}
          ItemSeparatorComponent={this.renderItemSeparator}
          ListFooterComponent={showFooter ? this.renderFooter : undefined}
          ListEmptyComponent={this.renderEmptyView(addressToE164Number, recipientCache)}
          keyExtractor={this.keyExtractor}
          initialNumToRender={30}
        />
      </View>
    )
  }
}

const style = StyleSheet.create({
  body: {
    flex: 1,
  },
  label: {
    alignSelf: 'center',
    color: colors.dark,
  },
  scrollViewContentContainer: {
    justifyContent: 'space-between',
  },
  separator: {
    backgroundColor: colors.darkLightest,
    height: 1,
    marginLeft: 60,
  },
  footer: {
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 50,
  },
  emptyView: {
    paddingHorizontal: 50,
    justifyContent: 'center',
  },
  emptyViewBody: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    textAlign: 'center',
  },
  emptyViewBodyDark: {
    color: colors.dark,
  },
  emptyViewBodySmall: {
    justifyContent: 'center',
    textAlign: 'center',
  },
  qrcodeRow: {
    padding: 5,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    marginHorizontal: 10,
  },
  qrcodeIconLeft: {
    borderWidth: 1,
    borderRadius: 15,
    borderColor: colors.celoGreen,
    padding: 4,
  },
  qrcodeTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    textAlignVertical: 'center',
    padding: 3,
  },
  qrcodeText: {
    alignSelf: 'center',
    lineHeight: 30,
  },
})

export default componentWithAnalytics(
  connect(
    mapStateToProps,
    {}
  )(withNamespaces(Namespaces.sendFlow7)(RecipientPicker))
)
